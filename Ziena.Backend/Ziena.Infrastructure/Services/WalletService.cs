using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class WalletService(ZienaDbContext context) : IWalletService
{
    public async Task<WalletDto> GetWalletAsync(Guid merchantId)
    {
        var wallet = await context.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.MerchantId == merchantId)
            ?? throw new KeyNotFoundException($"Wallet for merchant {merchantId} not found.");

        // PendingBalance: money in-flight — includes both Pending (awaiting provider
        // confirmation) and Confirmed (service booked, awaiting completion) bookings.
        var pendingBalance = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == merchantId &&
                        (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .SumAsync(b => b.TotalPrice);

        return new WalletDto(
            wallet.MerchantId,
            wallet.AvailableBalance,   // TotalEarnings - CommissionDeducted (computed)
            pendingBalance
        );
    }

    public async Task<WalletDto> ProcessCompletionAsync(Guid bookingId)
    {
        var booking = await context.Bookings.FindAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking {bookingId} not found.");

        if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            throw new InvalidOperationException(
                $"Only Pending or Confirmed bookings can be completed. Current status: {booking.Status}.");

        var wallet = await context.Wallets
            .FirstOrDefaultAsync(w => w.MerchantId == booking.MerchantId)
            ?? throw new KeyNotFoundException(
                $"Wallet for merchant {booking.MerchantId} not found.");

        // Credit the merchant's wallet
        wallet.TotalEarnings      += booking.TotalPrice;
        wallet.CommissionDeducted += booking.EscrowAmount;
        wallet.UpdatedAt           = DateTime.UtcNow;

        // Mark the booking as completed in the same transaction
        booking.Status    = BookingStatus.Completed;
        booking.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        // Re-calculate PendingBalance after the status change (this booking
        // is now Completed, so it no longer contributes to pending funds).
        var pendingBalance = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == wallet.MerchantId &&
                        (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .SumAsync(b => b.TotalPrice);

        return new WalletDto(
            wallet.MerchantId,
            wallet.AvailableBalance,
            pendingBalance
        );
    }
}
