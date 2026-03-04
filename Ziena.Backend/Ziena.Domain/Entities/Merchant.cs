namespace Ziena.Domain.Entities;

public class Merchant : BaseEntity
{
    public required Guid UserId { get; set; }
    public required string BusinessName { get; set; }
    public string? Bio { get; set; }
    public string? IBAN { get; set; }
    public bool IsVerified { get; set; }
    public decimal CommissionRate { get; set; } = 0.02m;
}
