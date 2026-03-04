using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IAdminService
{
    Task<PlatformStatsDto> GetPlatformStatsAsync();
}
