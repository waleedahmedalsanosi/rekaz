using Ziena.Application.DTOs;

namespace Ziena.Application.Interfaces;

public interface IWalletService
{
    Task<WalletDto> GetWalletAsync(Guid merchantId);
    /// <summary>Look up wallet by Node.js provider ID (e.g. "p1").</summary>
    Task<WalletDto> GetWalletByProviderRefAsync(string providerRefId);
    /// <summary>Accepts a .NET booking GUID or a Node.js ExternalId string.</summary>
    Task<WalletDto> ProcessCompletionAsync(string bookingRef);
}
