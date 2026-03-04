namespace Ziena.Domain.Entities;

public class Wallet : BaseEntity
{
    public required Guid MerchantId { get; set; }

    /// <summary>Sum of TotalPrice from all COMPLETED bookings for this merchant.</summary>
    public decimal TotalEarnings { get; set; }

    /// <summary>Sum of EscrowAmount deducted across all completed bookings.</summary>
    public decimal CommissionDeducted { get; set; }

    /// <summary>
    /// Calculated: TotalEarnings - CommissionDeducted.
    /// Not persisted — always derived from its components.
    /// </summary>
    public decimal AvailableBalance => TotalEarnings - CommissionDeducted;
}
