using Microsoft.EntityFrameworkCore;
using Ziena.Application.DTOs;
using Ziena.Application.Interfaces;
using Ziena.Domain.Entities;
using Ziena.Infrastructure.Persistence;

namespace Ziena.Infrastructure.Services;

public class AdminService(ZienaDbContext context) : IAdminService
{
    public async Task<PlatformStatsDto> GetPlatformStatsAsync()
    {
        var totalMerchants = await context.Merchants.CountAsync();
        var totalBookings  = await context.Bookings.CountAsync();

        var totalPlatformRevenue = await context.Bookings
            .AsNoTracking()
            .Where(b => b.Status == BookingStatus.Completed)
            .SumAsync(b => b.EscrowAmount);

        return new PlatformStatsDto(totalMerchants, totalBookings, totalPlatformRevenue);
    }
}
