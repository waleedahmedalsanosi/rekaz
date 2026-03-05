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

        // CommissionRate MUST be initialised before TotalPrice so the setter
        // uses the merchant-specific rate when calculating EscrowAmount.
        var booking = new Booking
        {
            ClientId       = dto.ClientId,
            MerchantId     = merchant.Id,
            ServiceId      = dto.ServiceId,
            ScheduledAt    = dto.ScheduledAt,
            CommissionRate = merchant.CommissionRate,
            TotalPrice     = dto.TotalPrice
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

    // ── Private helpers ──────────────────────────────────────────────────────

    private static BookingResponseDto MapToDto(Booking booking, string clientName, string merchantName) =>
        new(
            booking.Id,
            clientName,
            merchantName,
            booking.Status.ToString(),
            booking.TotalPrice,
            booking.EscrowAmount,
            booking.ScheduledAt
        );
}
