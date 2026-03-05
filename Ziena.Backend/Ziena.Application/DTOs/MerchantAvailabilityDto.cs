namespace Ziena.Application.DTOs;

public record MerchantAvailabilityDto(
    Guid    Id,
    string  BusinessName,
    string? Bio,
    bool    IsVerified,
    string? ProviderRefId
);

public record AvailabilityResponseDto(
    bool                                IsAvailable,
    IReadOnlyList<MerchantAvailabilityDto> AvailableMerchants,
    MerchantAvailabilityDto?            SuggestedMerchant,
    DateTime?                           SuggestedTime
);
