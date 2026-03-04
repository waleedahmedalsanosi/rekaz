using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class BookingService(ZienaDbContext context) : IBookingService
{
    public async Task<BookingResponseDto> CreateBookingAsync(BookingCreateDto dto)
    {
        var merchant = await context.Merchants.FindAsync(dto.MerchantId)
            ?? throw new KeyNotFoundException($"Merchant {dto.MerchantId} not found.");

        var client = await context.Users.FindAsync(dto.ClientId)
            ?? throw new KeyNotFoundException($"Client {dto.ClientId} not found.");

        // Guarantee the merchant has a wallet before we create a booking.
        // This handles real merchants who were not seeded by DbInitializer.
        var walletExists = await context.Wallets.AnyAsync(w => w.MerchantId == dto.MerchantId);
        if (!walletExists)
            context.Wallets.Add(new Wallet { MerchantId = dto.MerchantId });

        // CommissionRate MUST be initialised before TotalPrice so the setter
        // uses the merchant-specific rate (read from DB) when calculating EscrowAmount.
        var booking = new Booking
        {
            ClientId       = dto.ClientId,
            MerchantId     = dto.MerchantId,
            ServiceId      = dto.ServiceId,
            ScheduledAt    = dto.ScheduledAt,
            CommissionRate = merchant.CommissionRate,  // ← from DB, not hardcoded
            TotalPrice     = dto.TotalPrice            // ← setter fires, EscrowAmount auto-set
        };

        context.Bookings.Add(booking);
        await context.SaveChangesAsync(); // wallet + booking persisted atomically

        return MapToDto(booking, client.FullName, merchant.BusinessName);
    }

    public async Task<IReadOnlyList<BookingResponseDto>> GetMerchantBookingsAsync(Guid merchantId)
    {
        var merchantName = await context.Merchants
            .AsNoTracking()
            .Where(m => m.Id == merchantId)
            .Select(m => m.BusinessName)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Merchant {merchantId} not found.");

        // Join bookings with the Users table to retrieve each client's FullName.
        // Materialise first so Status.ToString() runs in memory, not in SQL.
        var rows = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == merchantId)
            .Join(
                context.Users,
                booking => booking.ClientId,
                user    => user.Id,
                (booking, user) => new { Booking = booking, ClientName = user.FullName })
            .ToListAsync();

        return rows
            .Select(r => MapToDto(r.Booking, r.ClientName, merchantName))
            .ToList();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static BookingResponseDto MapToDto(Booking booking, string clientName, string merchantName) =>
        new(
            booking.Id,
            clientName,
            merchantName,
            booking.Status.ToString(),   // enum → string (e.g. "Pending", "Confirmed")
            booking.TotalPrice,
            booking.EscrowAmount,
            booking.ScheduledAt
        );
}
