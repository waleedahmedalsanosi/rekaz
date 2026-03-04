using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IMerchantService
{
    Task<IReadOnlyList<MerchantDto>> GetAllAsync();
}
