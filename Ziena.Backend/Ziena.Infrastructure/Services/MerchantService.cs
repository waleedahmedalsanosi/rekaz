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
}
