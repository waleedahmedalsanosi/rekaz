namespace Ziena.Domain.Entities;

public class Merchant : BaseEntity
{
    public required Guid UserId { get; set; }
    public required string BusinessName { get; set; }
    /// <summary>Node.js provider ID (e.g. "p1", "p2") — bridges the two backends.</summary>
    public string? ProviderRefId { get; set; }
    public string? Bio { get; set; }
    public string? IBAN { get; set; }
    public bool IsVerified { get; set; }
    public decimal CommissionRate { get; set; } = 0.02m;
    /// <summary>JSON array of working-hour entries: [{day,enabled,start,end}]</summary>
    public string? WorkingHoursJson { get; set; }
}
