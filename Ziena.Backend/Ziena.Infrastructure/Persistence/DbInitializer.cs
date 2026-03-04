using Ziena.Domain.Entities;

namespace Ziena.Infrastructure.Persistence;

public static class DbInitializer
{
    // Well-known GUIDs so integration tests and curl scripts can hard-code them.
    public static readonly Guid ClientId        = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public static readonly Guid ProviderUserId1 = Guid.Parse("00000000-0000-0000-0000-000000000002");
    public static readonly Guid MerchantId1     = Guid.Parse("00000000-0000-0000-0000-000000000003");
    public static readonly Guid ProviderUserId2 = Guid.Parse("00000000-0000-0000-0000-000000000005");
    public static readonly Guid MerchantId2     = Guid.Parse("00000000-0000-0000-0000-000000000006");

    public static void Initialize(ZienaDbContext context)
    {
        context.Database.EnsureCreated();

        if (context.Users.Any()) return; // Already seeded

        context.Users.AddRange(
            new User
            {
                Id          = ClientId,
                FullName    = "أحمد العميل",
                PhoneNumber = "0555000001",
                Role        = UserRole.Client
            },
            new User
            {
                Id          = ProviderUserId1,
                FullName    = "ليلى أحمد",
                PhoneNumber = "0501234567",
                Role        = UserRole.Provider
            },
            new User
            {
                Id          = ProviderUserId2,
                FullName    = "ريم محمد",
                PhoneNumber = "0509876543",
                Role        = UserRole.Provider
            }
        );

        context.Merchants.AddRange(
            new Merchant
            {
                Id             = MerchantId1,
                UserId         = ProviderUserId1,
                BusinessName   = "ليلى أحمد — مكياج وعرائس",
                ProviderRefId  = "p1",
                CommissionRate = 0.02m,
                IsVerified     = true
            },
            new Merchant
            {
                Id             = MerchantId2,
                UserId         = ProviderUserId2,
                BusinessName   = "ريم محمد — تصفيف الشعر",
                ProviderRefId  = "p2",
                CommissionRate = 0.02m,
                IsVerified     = false
            }
        );

        context.Wallets.AddRange(
            new Wallet { MerchantId = MerchantId1 },
            new Wallet { MerchantId = MerchantId2 }
        );

        context.SaveChanges();
    }
}
