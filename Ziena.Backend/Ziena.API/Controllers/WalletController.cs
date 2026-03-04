using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/wallet")]
public class WalletController(IWalletService walletService) : ControllerBase
{
    // GET api/wallet/{merchantId}
    [HttpGet("{merchantId:guid}")]
    [ProducesResponseType(typeof(WalletDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWallet(Guid merchantId)
    {
        try
        {
            var wallet = await walletService.GetWalletAsync(merchantId);
            return Ok(wallet);
        }
        catch (KeyNotFoundException)
        {
            // New merchants have no wallet row yet — return zero balances
            // instead of an error so the UI always has a usable state.
            return Ok(new WalletDto(merchantId, AvailableBalance: 0m, PendingBalance: 0m));
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

    // POST api/wallet/complete-booking/{bookingId}
    [HttpPost("complete-booking/{bookingId:guid}")]
    [ProducesResponseType(typeof(WalletDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteBooking(Guid bookingId)
    {
        try
        {
            var wallet = await walletService.ProcessCompletionAsync(bookingId);
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
