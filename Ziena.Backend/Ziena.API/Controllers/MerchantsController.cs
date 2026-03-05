using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/merchants")]
public class MerchantsController(IMerchantService merchantService) : ControllerBase
{
    // GET api/merchants
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MerchantDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var merchants = await merchantService.GetAllAsync();
            return Ok(merchants);
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while retrieving merchants.",
                messageAr = "حدث خطأ أثناء استرجاع قائمة التجار",
                detail    = ex.Message
            });
        }
    }

    // PATCH api/merchants/{providerRefId}/working-hours
    [HttpPatch("{providerRefId}/working-hours")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateWorkingHours(string providerRefId, [FromBody] UpdateWorkingHoursRequest request)
    {
        try
        {
            await merchantService.UpdateWorkingHoursAsync(providerRefId, request.WorkingHoursJson);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { messageAr = "المزوّدة غير موجودة", detail = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { messageAr = "حدث خطأ أثناء حفظ أوقات العمل", detail = ex.Message });
        }
    }
}

public record UpdateWorkingHoursRequest(string WorkingHoursJson);
