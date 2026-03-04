using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(IAdminService adminService) : ControllerBase
{
    // GET api/admin/stats
    [HttpGet("stats")]
    [ProducesResponseType(typeof(PlatformStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await adminService.GetPlatformStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while retrieving platform statistics.",
                messageAr = "حدث خطأ أثناء استرجاع إحصائيات المنصة، يرجى المحاولة مرة أخرى",
                detail    = ex.Message
            });
        }
    }
}
