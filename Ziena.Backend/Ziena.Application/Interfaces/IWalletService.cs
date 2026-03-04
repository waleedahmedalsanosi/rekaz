using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IWalletService
{
    /// <summary>
    /// Returns the wallet for a merchant, including PendingBalance
    /// calculated from all Confirmed (in-escrow) bookings.
    /// </summary>
    Task<WalletDto> GetWalletAsync(Guid merchantId);

    /// <summary>
    /// Marks a booking as Completed, credits the merchant's wallet
    /// (TotalEarnings += TotalPrice, CommissionDeducted += EscrowAmount),
    /// and returns the refreshed WalletDto so the UI can update immediately.
    /// </summary>
    Task<WalletDto> ProcessCompletionAsync(Guid bookingId);
}
