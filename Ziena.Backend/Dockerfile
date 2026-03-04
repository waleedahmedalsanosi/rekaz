# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution + all project files first so layer cache is reused on code-only changes
COPY Ziena.Backend.slnx ./
COPY Ziena.Domain/Ziena.Domain.csproj           Ziena.Domain/
COPY Ziena.Application/Ziena.Application.csproj Ziena.Application/
COPY Ziena.Infrastructure/Ziena.Infrastructure.csproj Ziena.Infrastructure/
COPY Ziena.API/Ziena.API.csproj                 Ziena.API/

RUN dotnet restore Ziena.Backend.slnx

# Copy the rest of the source and publish
COPY . .
RUN dotnet publish Ziena.API/Ziena.API.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Render injects $PORT at runtime; ASP.NET Core reads ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}

EXPOSE 8080

ENTRYPOINT ["dotnet", "Ziena.API.dll"]
