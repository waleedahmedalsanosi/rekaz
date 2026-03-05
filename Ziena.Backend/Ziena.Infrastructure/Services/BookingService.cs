using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class BookingService(ZienaDbContext context, INotificationService notifications) : IBookingService
{
    public async Task<BookingResponseDto> CreateBookingAsync(BookingCreateDto dto)
    {
        // Look up merchant by ProviderRefId (Node.js provider ID bridge)
        var merchant = await context.Merchants
            .FirstOrDefaultAsync(m => m.ProviderRefId == dto.MerchantId)
            ?? throw new KeyNotFoundException(
                $"Merchant with ProviderRefId '{dto.MerchantId}' not found. " +
                "Ensure the .NET DB is seeded with matching ProviderRefId values.");

        // Guarantee the merchant has a wallet before we create a booking.
        var walletExists = await context.Wallets.AnyAsync(w => w.MerchantId == merchant.Id);
        if (!walletExists)
            context.Wallets.Add(new Wallet { MerchantId = merchant.Id });

        // Race-condition guard: re-check slot availability right before commit.
        // The 2-hour window mirrors GetAvailableMerchantsAsync.
        var windowStart = dto.ScheduledAt.AddHours(-2);
        var windowEnd   = dto.ScheduledAt.AddHours(2);
        var slotTaken   = await context.Bookings.AnyAsync(b =>
            b.MerchantId == merchant.Id &&
            (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed) &&
            b.ScheduledAt >= windowStart && b.ScheduledAt < windowEnd);

        if (slotTaken)
            throw new InvalidOperationException(
                "هذا الوقت لم يعد متاحاً، تم حجزه للتو. يرجى اختيار وقت آخر أو مزوّدة مختلفة.");

        // CommissionRate MUST be initialised before TotalPrice so the setter
        // uses the merchant-specific rate when calculating EscrowAmount.
        var booking = new Booking
        {
            ClientId       = dto.ClientId,
            MerchantId     = merchant.Id,
            ServiceId      = dto.ServiceId,
            ScheduledAt    = dto.ScheduledAt,
            CommissionRate = merchant.CommissionRate,
            TotalPrice     = dto.TotalPrice,
            ExternalId     = dto.ExternalId
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync();

        // Notify merchant of the new booking (fire-and-forget, non-blocking)
        if (merchant.ProviderRefId is not null)
        {
            _ = notifications.SendAsync(
                merchant.ProviderRefId,
                "حجز جديد! 🎉",
                $"لديكِ حجز جديد من {dto.ClientName} بقيمة {dto.TotalPrice:N0} ريال");
        }

        return MapToDto(booking, dto.ClientName, merchant.BusinessName);
    }

    public async Task<IReadOnlyList<BookingResponseDto>> GetMerchantBookingsAsync(Guid merchantId)
    {
        var merchantName = await context.Merchants
            .AsNoTracking()
            .Where(m => m.Id == merchantId)
            .Select(m => m.BusinessName)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Merchant {merchantId} not found.");

        var rows = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == merchantId)
            .ToListAsync();

        return rows
            .Select(r => MapToDto(r, r.ClientId, merchantName))
            .ToList();
    }

    public async Task<AvailabilityResponseDto> GetAvailableMerchantsAsync(string serviceId, DateTime requestedTime)
    {
        const int windowHours = 2;

        var allMerchants = await context.Merchants
            .AsNoTracking()
            .ToListAsync();

        var available = await GetAvailableAtAsync(allMerchants, requestedTime, windowHours);

        if (available.Count > 0)
            return new AvailabilityResponseDto(true, available, null, null);

        // No one free — scan forward: +2 h, +4 h, +6 h, tomorrow, day after
        var candidates = new[]
        {
            requestedTime.AddHours(2),
            requestedTime.AddHours(4),
            requestedTime.AddHours(6),
            requestedTime.Date.AddDays(1).Add(requestedTime.TimeOfDay),
            requestedTime.Date.AddDays(2).Add(requestedTime.TimeOfDay),
        };

        foreach (var candidate in candidates)
        {
            var freeAtCandidate = await GetAvailableAtAsync(allMerchants, candidate, windowHours);
            if (freeAtCandidate.Count > 0)
            {
                // Prefer verified merchants; otherwise take first
                var suggested = freeAtCandidate.FirstOrDefault(m => m.IsVerified)
                             ?? freeAtCandidate[0];
                return new AvailabilityResponseDto(false, [], suggested, candidate);
            }
        }

        // No slot found in the next two days
        return new AvailabilityResponseDto(false, [], null, null);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<IReadOnlyList<MerchantAvailabilityDto>> GetAvailableAtAsync(
        IEnumerable<Domain.Entities.Merchant> allMerchants, DateTime time, int windowHours)
    {
        var start = time.AddHours(-windowHours);
        var end   = time.AddHours(windowHours);

        var busyIds = await context.Bookings
            .AsNoTracking()
            .Where(b =>
                (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed) &&
                b.ScheduledAt >= start && b.ScheduledAt < end)
            .Select(b => b.MerchantId)
            .Distinct()
            .ToListAsync();

        return allMerchants
            .Where(m => !busyIds.Contains(m.Id) && IsWithinWorkingHours(m, time))
            .Select(m => new MerchantAvailabilityDto(m.Id, m.BusinessName, m.Bio, m.IsVerified, m.ProviderRefId))
            .ToList();
    }

    private static bool IsWithinWorkingHours(Domain.Entities.Merchant merchant, DateTime time)
    {
        if (string.IsNullOrEmpty(merchant.WorkingHoursJson)) return true; // no hours set → always available

        try
        {
            var entries = JsonSerializer.Deserialize<WorkingHourEntry[]>(merchant.WorkingHoursJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (entries is null || entries.Length == 0) return true;

            var dayName = time.DayOfWeek switch
            {
                DayOfWeek.Sunday    => "الأحد",
                DayOfWeek.Monday    => "الإثنين",
                DayOfWeek.Tuesday   => "الثلاثاء",
                DayOfWeek.Wednesday => "الأربعاء",
                DayOfWeek.Thursday  => "الخميس",
                DayOfWeek.Friday    => "الجمعة",
                DayOfWeek.Saturday  => "السبت",
                _                   => ""
            };

            var entry = Array.Find(entries, e => e.Day == dayName);
            if (entry is null || !entry.Enabled) return false;

            var requestedMinutes = time.Hour * 60 + time.Minute;
            var startParts = entry.Start.Split(':');
            var endParts   = entry.End.Split(':');
            if (startParts.Length < 2 || endParts.Length < 2) return true;

            var startMinutes = int.Parse(startParts[0]) * 60 + int.Parse(startParts[1]);
            var endMinutes   = int.Parse(endParts[0])   * 60 + int.Parse(endParts[1]);

            return requestedMinutes >= startMinutes && requestedMinutes < endMinutes;
        }
        catch
        {
            return true; // malformed JSON → treat as available
        }
    }

    private record WorkingHourEntry(string Day, bool Enabled, string Start, string End);

    private static BookingResponseDto MapToDto(Booking booking, string clientName, string merchantName) =>
        new(
            booking.Id,
            clientName,
            merchantName,
            booking.Status.ToString(),
            booking.TotalPrice,
            booking.EscrowAmount,
            booking.ScheduledAt,
            booking.ExternalId
        );
}
