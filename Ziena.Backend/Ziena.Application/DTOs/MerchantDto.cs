namespace Ziena.Application.DTOs;

public record MerchantDto(
    Guid    Id,
    string  BusinessName,
    string? Bio,
    bool    IsVerified,
    decimal CommissionRate,
    string? ProviderRefId   // Node.js provider ID bridge (e.g. "p1", "p2")
);
