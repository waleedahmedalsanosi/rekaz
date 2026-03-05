using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IMerchantService
{
    Task<IReadOnlyList<MerchantDto>> GetAllAsync();
    Task UpdateWorkingHoursAsync(string providerRefId, string workingHoursJson);
    /// <summary>Creates a Merchant row for a new provider if one doesn't exist yet.</summary>
    Task EnsureMerchantAsync(string providerRefId, string businessName);
}
