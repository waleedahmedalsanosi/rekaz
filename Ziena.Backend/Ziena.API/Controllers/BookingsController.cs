using Microsoft.AspNetCore.Mvc;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;

namespace Ziena.API.Controllers;

[ApiController]
[Route("api/bookings")]
public class BookingsController(IBookingService bookingService) : ControllerBase
{
    // POST api/bookings
    [HttpPost]
    [ProducesResponseType(typeof(BookingResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBooking([FromBody] BookingCreateDto dto)
    {
        try
        {
            var result = await bookingService.CreateBookingAsync(dto);
            return CreatedAtAction(nameof(GetMerchantBookings),
                new { merchantId = result.Id }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new
            {
                message   = ex.Message,
                messageAr = "لم يتم العثور على التاجر أو العميل المطلوب"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while creating the booking.",
                messageAr = "حدث خطأ أثناء إنشاء الحجز، يرجى المحاولة مرة أخرى",
                detail    = ex.Message
            });
        }
    }

    // GET api/bookings/merchant/{merchantId}
    [HttpGet("merchant/{merchantId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<BookingResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMerchantBookings(Guid merchantId)
    {
        try
        {
            var bookings = await bookingService.GetMerchantBookingsAsync(merchantId);
            return Ok(bookings);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new
            {
                message   = ex.Message,
                messageAr = "لم يتم العثور على التاجر المطلوب"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message   = "An error occurred while retrieving bookings.",
                messageAr = "حدث خطأ أثناء استرجاع الحجوزات، يرجى المحاولة مرة أخرى",
                detail    = ex.Message
            });
        }
    }
}
