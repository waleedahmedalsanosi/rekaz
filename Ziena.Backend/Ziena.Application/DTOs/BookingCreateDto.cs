namespace Ziena.Application.DTOs;

public record BookingCreateDto(
    string   ClientId,      // Node.js user ID (e.g. "user-c1")
    string   ClientName,    // Display name — passed by frontend since client may not exist in .NET DB
    string   MerchantId,    // Node.js provider ID (e.g. "p1") — resolved to Merchant.ProviderRefId
    string   ServiceId,     // Node.js service ID (e.g. "s1")
    DateTime ScheduledAt,
    decimal  TotalPrice,
    string?  ExternalId = null // Node.js booking UUID — stored for cross-system lookup
);
