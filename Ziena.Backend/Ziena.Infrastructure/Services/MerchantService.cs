using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class MerchantService(ZienaDbContext context) : IMerchantService
{
    public async Task<IReadOnlyList<MerchantDto>> GetAllAsync()
    {
        return await context.Merchants
            .AsNoTracking()
            .Select(m => new MerchantDto(
                m.Id,
                m.BusinessName,
                m.Bio,
                m.IsVerified,
                m.CommissionRate,
                m.ProviderRefId))
            .ToListAsync();
    }

    public async Task UpdateWorkingHoursAsync(string providerRefId, string workingHoursJson)
    {
        var merchant = await context.Merchants
            .FirstOrDefaultAsync(m => m.ProviderRefId == providerRefId)
            ?? throw new KeyNotFoundException($"Merchant with ProviderRefId '{providerRefId}' not found.");

        merchant.WorkingHoursJson = workingHoursJson;
        await context.SaveChangesAsync();
    }

    public async Task EnsureMerchantAsync(string providerRefId, string businessName)
    {
        var existing = await context.Merchants
            .AnyAsync(m => m.ProviderRefId == providerRefId);
        if (existing) return;

        context.Merchants.Add(new Ziena.Domain.Entities.Merchant
        {
            ProviderRefId  = providerRefId,
            BusinessName   = businessName,
            CommissionRate = 0.02m,
            IsVerified     = false,
        });
        var wallet = new Ziena.Domain.Entities.Wallet();
        // wallet.MerchantId will be set by EF after SaveChanges via navigation
        // Add wallet after merchant to get the generated Id
        await context.SaveChangesAsync();

        var merchant = await context.Merchants
            .FirstAsync(m => m.ProviderRefId == providerRefId);
        context.Wallets.Add(new Ziena.Domain.Entities.Wallet { MerchantId = merchant.Id });
        await context.SaveChangesAsync();
    }
}
