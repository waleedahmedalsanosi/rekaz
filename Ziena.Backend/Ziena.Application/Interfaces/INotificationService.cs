using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface INotificationService
{
    /// <summary>Returns the base64url-encoded VAPID public key for the frontend.</summary>
    Task<string> GetVapidPublicKeyAsync();

    /// <summary>Saves (or updates) a push subscription for the given user.</summary>
    Task SubscribeAsync(PushSubscriptionDto dto);

    /// <summary>Sends a push notification to all subscribed devices for this user.</summary>
    Task SendAsync(string userRef, string title, string body);
}
