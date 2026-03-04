namespace Ziena.Application.DTOs;

public record PlatformStatsDto(
    int TotalMerchants,
    int TotalBookings,
    decimal TotalPlatformRevenue   // sum of EscrowAmount for all Completed bookings
);
