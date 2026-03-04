namespace TaskManager.Backend.Source
{
    public class Constants
    {
        public static string JWT_SIGNING_KEY => Environment.GetEnvironmentVariable("JWT_SIGNING_KEY") ?? string.Empty;
        public static string WEB_APP_URI => Environment.GetEnvironmentVariable("WEB_APP_URI") ?? string.Empty;
        public static string BACKEND_URI => Environment.GetEnvironmentVariable("BACKEND_URI") ?? string.Empty;

        public const int JWT_EXPIRATION_MINUTES = 15;
        public const int REFRESH_TOKEN_EXPIRATION_DAYS = 7;
    }
}
