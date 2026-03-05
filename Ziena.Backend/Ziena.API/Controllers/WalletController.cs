using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/wallet")]
public class WalletController(IWalletService walletService) : ControllerBase
{
    // GET api/wallet/{providerRefId}  — accepts Node.js provider ID (e.g. "p1")
    [HttpGet("{providerRefId}")]
    [ProducesResponseType(typeof(WalletDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWallet(string providerRefId)
    {
        try
        {
            var wallet = await walletService.GetWalletByProviderRefAsync(providerRefId);
            return Ok(wallet);
        }
        catch (KeyNotFoundException)
        {
            // Unknown provider ref — return zero balances so the UI has a usable state.
            return Ok(new WalletDto(Guid.Empty, AvailableBalance: 0m, PendingBalance: 0m));
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while retrieving the wallet.",
                messageAr = "حدث خطأ أثناء استرجاع بيانات المحفظة، يرجى المحاولة مرة أخرى",
                detail    = ex.Message
            });
        }
    }

    // POST api/wallet/complete-booking/{bookingRef}  — accepts .NET GUID or Node.js ExternalId
    [HttpPost("complete-booking/{bookingRef}")]
    [ProducesResponseType(typeof(WalletDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteBooking(string bookingRef)
    {
        try
        {
            var wallet = await walletService.ProcessCompletionAsync(bookingRef);
            return Ok(wallet);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new
            {
                message   = ex.Message,
                messageAr = "لم يتم العثور على الحجز أو المحفظة المطلوبة"
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message   = ex.Message,
                messageAr = "لا يمكن إتمام هذا الحجز — يجب أن تكون حالته 'معلّق' أو 'مؤكد'"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while completing the booking.",
                messageAr = "حدث خطأ أثناء إتمام الحجز، يرجى المحاولة مرة أخرى",
                detail    = ex.Message
            });
        }
    }
}
