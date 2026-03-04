namespace Ziena.Application.DTOs;

public record WalletDto(
    Guid    MerchantId,
    decimal AvailableBalance,
    decimal PendingBalance
);
