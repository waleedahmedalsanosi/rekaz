using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    /// <summary>Returns the VAPID public key so the browser can subscribe.</summary>
    [HttpGet("vapid-public-key")]
    public async Task<IActionResult> GetVapidPublicKey()
    {
        var publicKey = await notificationService.GetVapidPublicKeyAsync();
        if (string.IsNullOrEmpty(publicKey))
            return NotFound(new { 
                message = "VAPID keys not initialised yet.",
                messageAr = "لم يتم تهيئة مفاتيح التنبيهات في الخادم" 
            });

        return Ok(new { publicKey });
    }

    /// <summary>Saves a browser push subscription for the given user.</summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.UserRef) ||
            string.IsNullOrWhiteSpace(dto.Endpoint) ||
            string.IsNullOrWhiteSpace(dto.P256DH)   ||
            string.IsNullOrWhiteSpace(dto.Auth))
        {
            return BadRequest(new { message = "جميع الحقول مطلوبة." });
        }

        try
        {
            await notificationService.SubscribeAsync(dto);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
