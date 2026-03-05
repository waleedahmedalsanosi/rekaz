using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class WalletService(ZienaDbContext context, INotificationService notifications) : IWalletService
{
    public async Task<WalletDto> GetWalletAsync(Guid merchantId)
    {
        var wallet = await context.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.MerchantId == merchantId)
            ?? throw new KeyNotFoundException($"Wallet for merchant {merchantId} not found.");

        var pendingBalance = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == merchantId &&
                        (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .SumAsync(b => b.TotalPrice);

        return new WalletDto(wallet.MerchantId, wallet.AvailableBalance, pendingBalance);
    }

    public async Task<WalletDto> GetWalletByProviderRefAsync(string providerRefId)
    {
        var merchant = await context.Merchants
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.ProviderRefId == providerRefId)
            ?? throw new KeyNotFoundException(
                $"Merchant with ProviderRefId '{providerRefId}' not found.");

        return await GetWalletAsync(merchant.Id);
    }

    public async Task<WalletDto> ProcessCompletionAsync(string bookingRef)
    {
        // Accept either the .NET GUID or the Node.js ExternalId string
        Booking? booking = null;
        if (Guid.TryParse(bookingRef, out var guid))
            booking = await context.Bookings.FindAsync(guid);

        booking ??= await context.Bookings
            .FirstOrDefaultAsync(b => b.ExternalId == bookingRef);

        if (booking is null)
            throw new KeyNotFoundException($"Booking '{bookingRef}' not found.");

        if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Confirmed)
            throw new InvalidOperationException(
                $"Only Pending or Confirmed bookings can be completed. Current status: {booking.Status}.");

        var wallet = await context.Wallets
            .FirstOrDefaultAsync(w => w.MerchantId == booking.MerchantId)
            ?? throw new KeyNotFoundException(
                $"Wallet for merchant {booking.MerchantId} not found.");

        wallet.TotalEarnings      += booking.TotalPrice;
        wallet.CommissionDeducted += booking.EscrowAmount;
        wallet.UpdatedAt           = DateTime.UtcNow;

        booking.Status    = BookingStatus.Completed;
        booking.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        var pendingBalance = await context.Bookings
            .AsNoTracking()
            .Where(b => b.MerchantId == wallet.MerchantId &&
                        (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .SumAsync(b => b.TotalPrice);

        // Notify merchant — fire-and-forget
        var merchantRef = await context.Merchants
            .AsNoTracking()
            .Where(m => m.Id == wallet.MerchantId)
            .Select(m => m.ProviderRefId)
            .FirstOrDefaultAsync();

        if (merchantRef is not null)
        {
            var credited = booking.TotalPrice - booking.EscrowAmount;
            _ = notifications.SendAsync(
                merchantRef,
                "تم استلام الدفع! 💰",
                $"تم إضافة {credited:N0} ريال لمحفظتك!");
        }

        return new WalletDto(wallet.MerchantId, wallet.AvailableBalance, pendingBalance);
    }
}
