using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ziena.Application.Interfaces;
using Ziena.Infrastructure.Persistence;
using Ziena.Infrastructure.Services;

namespace Ziena.Infrastructure.Extensions;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ZienaDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("Default")));

        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IWalletService, WalletService>();
        services.AddScoped<IAdminService, AdminService>();

        return services;
    }
}
