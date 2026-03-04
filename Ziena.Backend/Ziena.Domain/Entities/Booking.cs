namespace Ziena.Domain.Entities;

public class Booking : BaseEntity
{
    public required Guid ClientId { get; set; }
    public required Guid MerchantId { get; set; }
    public required Guid ServiceId { get; set; }
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
