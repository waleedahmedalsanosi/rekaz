namespace Ziena.Domain.Entities;

/// <summary>
/// Singleton row that stores the auto-generated VAPID key pair for Web Push.
/// Generated once by DbInitializer on first startup.
/// </summary>
public class VapidKey
{
    public int    Id         { get; set; } = 1;
    public string PublicKey  { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
}
