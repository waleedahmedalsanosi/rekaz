using Ziena.Domain.Entities;

namespace Ziena.Infrastructure.Persistence;

public static class DbInitializer
{
    // Well-known GUIDs so integration tests and curl scripts can hard-code them.
    public static readonly Guid ClientId       = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public static readonly Guid ProviderUserId = Guid.Parse("00000000-0000-0000-0000-000000000002");
    public static readonly Guid MerchantId     = Guid.Parse("00000000-0000-0000-0000-000000000003");
    public static readonly Guid ServiceId      = Guid.Parse("00000000-0000-0000-0000-000000000004");

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
                Id          = ProviderUserId,
                FullName    = "مزود الخدمة",
                PhoneNumber = "0555000002",
                Role        = UserRole.Provider
            }
        );

        context.Merchants.Add(new Merchant
        {
            Id             = MerchantId,
            UserId         = ProviderUserId,
            BusinessName   = "صالون زينة",
            CommissionRate = 0.02m,
            IsVerified     = true
        });

        context.Wallets.Add(new Wallet
        {
            MerchantId = MerchantId  // starts at 0 / 0
        });

        context.SaveChanges();
    }
}
