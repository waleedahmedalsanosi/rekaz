using Microsoft.EntityFrameworkCore;
using Ziena.Domain.Entities;

namespace Ziena.Infrastructure.Persistence;

public class ZienaDbContext(DbContextOptions<ZienaDbContext> options) : DbContext(options)
{
    public DbSet<User>     Users     => Set<User>();
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<Booking>  Bookings  => Set<Booking>();
    public DbSet<Wallet>   Wallets   => Set<Wallet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.PhoneNumber)
                  .IsRequired()
                  .HasMaxLength(20);

            // Unique index on PhoneNumber (used for OTP login lookup)
            entity.HasIndex(u => u.PhoneNumber)
                  .IsUnique()
                  .HasDatabaseName("IX_Users_PhoneNumber");

            entity.Property(u => u.FullName)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(u => u.Role)
                  .HasConversion<string>()
                  .HasMaxLength(20);

            entity.Property(u => u.IsActive)
                  .HasDefaultValue(true);
        });

        // ── Merchant ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Merchant>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.Property(m => m.BusinessName)
                  .IsRequired()
                  .HasMaxLength(200);

            entity.Property(m => m.Bio)
                  .HasMaxLength(1000);

            entity.Property(m => m.IBAN)
                  .HasMaxLength(50);

            entity.Property(m => m.CommissionRate)
                  .HasPrecision(5, 4)
                  .HasDefaultValue(0.02m);

            // One-to-One: each Merchant belongs to exactly one User
            entity.HasOne<User>()
                  .WithOne()
                  .HasForeignKey<Merchant>(m => m.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Booking ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(b => b.Id);

            entity.Property(b => b.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20);

            // TotalPrice: use the property setter so the EscrowAmount
            // backing-field calculation runs on materialisation as well.
            entity.Property(b => b.TotalPrice)
                  .HasField("_totalPrice")
                  .UsePropertyAccessMode(PropertyAccessMode.Property)
                  .HasPrecision(18, 4);

            // EscrowAmount: private setter – EF Core sets it via reflection.
            // Stored so historic records remain accurate if commission changes.
            entity.Property(b => b.EscrowAmount)
                  .HasPrecision(18, 4);

            // CommissionRate: snapshot of the merchant's rate at booking time.
            entity.Property(b => b.CommissionRate)
                  .HasPrecision(5, 4)
                  .HasDefaultValue(0.02m);

            // FK: ClientId → Users (Many bookings per client)
            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(b => b.ClientId)
                  .OnDelete(DeleteBehavior.Restrict);

            // FK: MerchantId → Merchants (Many bookings per merchant)
            entity.HasOne<Merchant>()
                  .WithMany()
                  .HasForeignKey(b => b.MerchantId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Wallet ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.HasKey(w => w.Id);

            entity.Property(w => w.TotalEarnings)
                  .HasPrecision(18, 4)
                  .HasDefaultValue(0m);

            entity.Property(w => w.CommissionDeducted)
                  .HasPrecision(18, 4)
                  .HasDefaultValue(0m);

            // AvailableBalance is always TotalEarnings - CommissionDeducted;
            // derived in memory — never stored as a separate column.
            entity.Ignore(w => w.AvailableBalance);

            // One-to-One: each Wallet belongs to exactly one Merchant
            entity.HasOne<Merchant>()
                  .WithOne()
                  .HasForeignKey<Wallet>(w => w.MerchantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Unique constraint enforces one wallet per merchant
            entity.HasIndex(w => w.MerchantId)
                  .IsUnique()
                  .HasDatabaseName("IX_Wallets_MerchantId");
        });
    }
}
