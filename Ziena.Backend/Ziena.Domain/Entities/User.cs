namespace Ziena.Domain.Entities;

public class User : BaseEntity
{
    public required string PhoneNumber { get; set; }
    public required string FullName { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
}
