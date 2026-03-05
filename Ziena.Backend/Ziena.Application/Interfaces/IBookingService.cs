using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IBookingService
{
    /// <summary>
    /// Creates a booking using the merchant's current CommissionRate to calculate escrow.
    /// </summary>
    Task<BookingResponseDto> CreateBookingAsync(BookingCreateDto dto);

    /// <summary>
    /// Returns all bookings for a merchant, including the client's full name.
    /// </summary>
    Task<IReadOnlyList<BookingResponseDto>> GetMerchantBookingsAsync(Guid merchantId);

    /// <summary>
    /// Returns merchants available at requestedTime (no conflicting Pending/Confirmed booking
    /// within a 2-hour window). If none available, returns a nearest-slot suggestion.
    /// </summary>
    Task<AvailabilityResponseDto> GetAvailableMerchantsAsync(string serviceId, DateTime requestedTime);
}
