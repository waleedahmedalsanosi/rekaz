using System.Security.Cryptography;
using System.Text.Json;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

/// <summary>
/// Singleton service — holds one PushServiceClient for the process lifetime.
/// DB access uses IServiceScopeFactory to avoid captive-dependency issues.
/// </summary>
public sealed class NotificationService(IServiceScopeFactory scopeFactory, IConfiguration configuration)
    : INotificationService, IDisposable
{
    private PushServiceClient?      _client;
    private readonly SemaphoreSlim  _lock = new(1, 1);
    private string VapidSubject => configuration["Vapid:Subject"] ?? "mailto:admin@ziena.app";

    // ── Public interface ────────────────────────────────────────────────────

    public async Task<string> GetVapidPublicKeyAsync()
    {
        using var scope   = scopeFactory.CreateScope();
        var context       = scope.ServiceProvider.GetRequiredService<ZienaDbContext>();
        var key           = await context.VapidKeys.AsNoTracking().FirstOrDefaultAsync();
        return key?.PublicKey ?? string.Empty;
    }

    public async Task SubscribeAsync(PushSubscriptionDto dto)
    {
        using var scope = scopeFactory.CreateScope();
        var context     = scope.ServiceProvider.GetRequiredService<ZienaDbContext>();

        var existing = await context.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserRef == dto.UserRef && s.Endpoint == dto.Endpoint);

        if (existing is not null)
        {
            existing.P256DH = dto.P256DH;
            existing.Auth   = dto.Auth;
        }
        else
        {
            context.UserPushSubscriptions.Add(new UserPushSubscription
            {
                UserRef   = dto.UserRef,
                Endpoint  = dto.Endpoint,
                P256DH    = dto.P256DH,
                Auth      = dto.Auth,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await context.SaveChangesAsync();
    }

    public async Task SendAsync(string userRef, string title, string body)
    {
        using var scope = scopeFactory.CreateScope();
        var context     = scope.ServiceProvider.GetRequiredService<ZienaDbContext>();

        var subscriptions = await context.UserPushSubscriptions
            .Where(s => s.UserRef == userRef)
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var client = await GetOrCreateClientAsync(context);
        if (client is null) return;

        var payload = JsonSerializer.Serialize(new
        {
            title,
            body,
            icon = "/icons/icon-192.png",
            dir  = "rtl",
        });

        var stale = new List<Guid>();
        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new PushSubscription { Endpoint = sub.Endpoint };
                pushSub.SetKey(PushEncryptionKeyName.P256DH, sub.P256DH);
                pushSub.SetKey(PushEncryptionKeyName.Auth,   sub.Auth);

                var message = new PushMessage(payload) { TimeToLive = 3600 };
                await client.RequestPushMessageDeliveryAsync(pushSub, message);
            }
            catch (PushServiceClientException ex)
                when (ex.StatusCode is System.Net.HttpStatusCode.NotFound
                                    or System.Net.HttpStatusCode.Gone)
            {
                stale.Add(sub.Id); // endpoint expired — clean up
            }
            catch
            {
                // ignore transient network errors
            }
        }

        if (stale.Count > 0)
        {
            context.UserPushSubscriptions.RemoveRange(
                subscriptions.Where(s => stale.Contains(s.Id)));
            await context.SaveChangesAsync();
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private async Task<PushServiceClient?> GetOrCreateClientAsync(ZienaDbContext context)
    {
        if (_client is not null) return _client;

        await _lock.WaitAsync();
        try
        {
            if (_client is not null) return _client;

            var key = await context.VapidKeys.AsNoTracking().FirstOrDefaultAsync();
            if (key is null) return null;

            var client = new PushServiceClient();
            client.DefaultAuthentication = new VapidAuthentication(key.PublicKey, key.PrivateKey)
            {
                Subject = VapidSubject,
            };

            _client = client;
            return _client;
        }
        finally
        {
            _lock.Release();
        }
    }

    // ── VAPID key generation ────────────────────────────────────────────────

    /// <summary>Generates a fresh VAPID key pair (EC P-256, base64url-encoded).</summary>
    public static (string PublicKey, string PrivateKey) GenerateVapidKeys()
    {
        using var ecdsa    = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var       p        = ecdsa.ExportParameters(includePrivateParameters: true);

        // Uncompressed EC public key: 0x04 || X (32 bytes) || Y (32 bytes) = 65 bytes
        var pub = new byte[65];
        pub[0] = 0x04;
        Pad32(p.Q.X!, pub, 1);
        Pad32(p.Q.Y!, pub, 33);

        // Private key: D (32 bytes, left-padded)
        var priv = new byte[32];
        Pad32(p.D!, priv, 0);

        return (B64U(pub), B64U(priv));

        static void Pad32(byte[] src, byte[] dst, int offset)
        {
            var skip = 32 - src.Length;
            Buffer.BlockCopy(src, 0, dst, offset + skip, src.Length);
        }
        static string B64U(byte[] b) =>
            Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public void Dispose()
    {
        _lock.Dispose();
    }
}
