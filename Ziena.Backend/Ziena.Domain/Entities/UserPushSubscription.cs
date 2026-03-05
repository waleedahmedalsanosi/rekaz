namespace Ziena.Domain.Entities;

/// <summary>
/// Stores a browser push subscription (endpoint + encryption keys) for a user.
/// UserRef = Node.js provider ID (e.g. "p1") — matches Merchant.ProviderRefId.
/// </summary>
public class UserPushSubscription
{
    public Guid     Id        { get; set; } = Guid.NewGuid();
    public string   UserRef   { get; set; } = string.Empty;
    public string   Endpoint  { get; set; } = string.Empty;
    public string   P256DH    { get; set; } = string.Empty;
    public string   Auth      { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
