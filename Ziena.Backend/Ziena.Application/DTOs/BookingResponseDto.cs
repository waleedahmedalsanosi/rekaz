namespace Ziena.Application.DTOs;

public record BookingResponseDto(
    Guid     Id,
    string   ClientName,
    string   MerchantName,
    string   Status,
    decimal  TotalPrice,
    decimal  EscrowAmount,
    DateTime ScheduledAt
);
