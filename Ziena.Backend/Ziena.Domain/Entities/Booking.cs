namespace Ziena.Domain.Entities;

public class Booking : BaseEntity
{
    /// <summary>Node.js user ID (e.g. "user-c1") — not a FK to the .NET Users table.</summary>
    public required string ClientId { get; set; }
    public required Guid MerchantId { get; set; }
    /// <summary>Node.js service ID (e.g. "s1") — no Services table in .NET.</summary>
    public required string ServiceId { get; set; }
    /// <summary>Node.js booking UUID — cross-system reference for completing bookings.</summary>
    public string? ExternalId { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public required DateTime ScheduledAt { get; set; }

    /// <summary>
    /// Commission rate captured from the Merchant at booking time.
    /// Defaults to 0.02 (2%). Must be set before TotalPrice in object initializers.
    /// </summary>
    public decimal CommissionRate { get; set; } = 0.02m;

    private decimal _totalPrice;
    public required decimal TotalPrice
    {
        get => _totalPrice;
        set
        {
            _totalPrice = value;
            EscrowAmount = Math.Ceiling(_totalPrice * CommissionRate);
        }
    }

    /// <summary>
    /// Automatically calculated as Math.Ceiling(TotalPrice * CommissionRate).
    /// Updated whenever TotalPrice is set.
    /// </summary>
    public decimal EscrowAmount { get; private set; }
}
