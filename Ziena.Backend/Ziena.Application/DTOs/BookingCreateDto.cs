namespace Ziena.Application.DTOs;

public record BookingCreateDto(
    Guid     ClientId,
    Guid     MerchantId,
    Guid     ServiceId,
    DateTime ScheduledAt,
    decimal  TotalPrice
);
