namespace Ziena.Application.DTOs;

/// <summary>POST /api/notifications/subscribe — request body.</summary>
public record PushSubscriptionDto(
    string UserRef,    // Node.js provider ID (e.g. "p1")
    string Endpoint,   // push service URL
    string P256DH,     // DH public key (base64url)
    string Auth        // auth secret (base64url)
);
