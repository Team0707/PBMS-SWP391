package com.parking.pbms.service;

import com.parking.pbms.model.Account;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Locale;

@Service
public class JwtService {

    @Value("${security.jwt.secret}")
    private String jwtSecret;

    @Value("${security.jwt.expiration-ms}")
    private long jwtExpirationMs;

    public String generateToken(Account account) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(account.getUsername())
                .claim("accountId", account.getAccountId())
                .claim(
                        "role",
                        account.getRoleName() != null ? account.getRoleName().toUpperCase(Locale.ROOT) : null
                )
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Date extractExpiration(String token) {
        return extractAllClaims(token).getExpiration();
    }

    public boolean isTokenValid(
            String token,
            UserDetails userDetails
    ) {
        String username = extractUsername(token);

        return username.equalsIgnoreCase(userDetails.getUsername())
                && extractExpiration(token).after(new Date());
    }

    public long getJwtExpirationMs() {
        return jwtExpirationMs;
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String generateVerificationToken(String username) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + 86400000L); // 24 hours

        return Jwts.builder()
                .subject(username)
                .claim("purpose", "verification")
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateResetPasswordToken(String username) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + 900000L); // 15 minutes

        return Jwts.builder()
                .subject(username)
                .claim("purpose", "reset-password")
                .issuedAt(now)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsernameAndVerifyPurpose(String token, String expectedPurpose) {
        try {
            Claims claims = extractAllClaims(token);
            String purpose = claims.get("purpose", String.class);
            if (purpose == null || !purpose.equals(expectedPurpose)) {
                throw new RuntimeException("Token không đúng mục đích sử dụng.");
            }
            return claims.getSubject();
        } catch (Exception e) {
            throw new RuntimeException("Token không hợp lệ hoặc đã hết hạn.");
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
