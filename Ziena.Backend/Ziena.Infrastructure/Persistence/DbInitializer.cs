using Microsoft.EntityFrameworkCore;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Services;

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

        // Ensure new tables exist for DBs created before this migration
        context.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ""VapidKeys"" (""Id"" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ""PublicKey"" TEXT NOT NULL DEFAULT '', ""PrivateKey"" TEXT NOT NULL DEFAULT '')");
        context.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ""UserPushSubscriptions"" (""Id"" TEXT NOT NULL CONSTRAINT ""PK_UserPushSubscriptions"" PRIMARY KEY, ""UserRef"" TEXT NOT NULL DEFAULT '', ""Endpoint"" TEXT NOT NULL DEFAULT '', ""P256DH"" TEXT NOT NULL DEFAULT '', ""Auth"" TEXT NOT NULL DEFAULT '', ""CreatedAt"" TEXT NOT NULL DEFAULT '')");
        context.Database.ExecuteSqlRaw(@"CREATE INDEX IF NOT EXISTS ""IX_UserPushSubscriptions_UserRef"" ON ""UserPushSubscriptions"" (""UserRef"")");

        // Add ExternalId column to Bookings for cross-system Node.js UUID lookup
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""Bookings"" ADD COLUMN ""ExternalId"" TEXT"); } catch { /* column already exists */ }

        // Add WorkingHoursJson column to Merchants
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""Merchants"" ADD COLUMN ""WorkingHoursJson"" TEXT"); } catch { /* column already exists */ }
        context.Database.ExecuteSqlRaw(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Bookings_ExternalId"" ON ""Bookings"" (""ExternalId"") WHERE ""ExternalId"" IS NOT NULL");

        // Generate VAPID keys once on first startup.
        // If VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env vars are set, use them (stable across re-deploys).
        if (!context.VapidKeys.Any())
        {
            var envPub  = Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
            var envPriv = Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");
            string pub, priv;
            if (!string.IsNullOrWhiteSpace(envPub) && !string.IsNullOrWhiteSpace(envPriv))
            {
                pub  = envPub;
                priv = envPriv;
                Console.WriteLine("[Ziena] Using VAPID keys from environment variables.");
            }
            else
            {
                (pub, priv) = NotificationService.GenerateVapidKeys();
                Console.WriteLine($"[Ziena] Generated VAPID public key: {pub}");
                Console.WriteLine("[Ziena] TIP: Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env vars to persist keys across re-deploys.");
            }
            context.VapidKeys.Add(new VapidKey { PublicKey = pub, PrivateKey = priv });
            context.SaveChanges();
        }

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
