namespace Ziena.Application.DTOs;

public record MerchantDto(
    Guid    Id,
    string  BusinessName,
    string? Bio,
    bool    IsVerified,
    decimal CommissionRate
);
