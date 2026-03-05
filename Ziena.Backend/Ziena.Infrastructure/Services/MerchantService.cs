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
}
