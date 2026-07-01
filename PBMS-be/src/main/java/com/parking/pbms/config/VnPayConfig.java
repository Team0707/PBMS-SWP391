package com.parking.pbms.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Configuration
@Getter
public class VnPayConfig {

    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${vnpay.pay-url}")
    private String vnpPayUrl;

    @Value("${vnpay.return-url}")
    private String vnpReturnUrl;

    @Value("${vnpay.api-url}")
    private String vnpApiUrl;

    /**
     * Ham bam HMAC-SHA512 chuan cua VNPay 2.1.0
     * Dau ra: chuoi hex lowercase 128 ky tu
     */
    public static String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }

    public String createPaymentUrl(long orderCode, long amount, String orderInfo, String ipAddr) {
        try {
            long vnpAmount = amount * 100;

            // TreeMap tu dong sort A-Z theo ten tham so
            Map<String, String> vnp_Params = new TreeMap<>();
            vnp_Params.put("vnp_Version", "2.1.0");
            vnp_Params.put("vnp_Command", "pay");
            vnp_Params.put("vnp_TmnCode", vnpTmnCode);
            vnp_Params.put("vnp_Amount", String.valueOf(vnpAmount));
            vnp_Params.put("vnp_CurrCode", "VND");
            vnp_Params.put("vnp_TxnRef", String.valueOf(orderCode));
            vnp_Params.put("vnp_OrderInfo", orderInfo);
            vnp_Params.put("vnp_OrderType", "other");
            vnp_Params.put("vnp_Locale", "vn");
            vnp_Params.put("vnp_ReturnUrl", vnpReturnUrl);
            vnp_Params.put("vnp_IpAddr", ipAddr == null ? "127.0.0.1" : ipAddr);

            Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
            vnp_Params.put("vnp_CreateDate", formatter.format(cld.getTime()));
            cld.add(Calendar.MINUTE, 15);
            vnp_Params.put("vnp_ExpireDate", formatter.format(cld.getTime()));

            // ================================================================
            // BUILD HASHDATA VA QUERY THEO DUNG TAI LIEU VNPAY 2.1.0:
            //   hashData: fieldName=URLEncode(fieldValue, US_ASCII) <-- key giu nguyen, value encode US_ASCII
            //   query   : URLEncode(fieldName)=URLEncode(fieldValue) <-- ca 2 encode US_ASCII
            //   Dung itr.hasNext() de quyet dinh them '&'
            // ================================================================
            StringBuilder hashData = new StringBuilder();
            StringBuilder query = new StringBuilder();
            Iterator<Map.Entry<String, String>> itr = vnp_Params.entrySet().iterator();

            while (itr.hasNext()) {
                Map.Entry<String, String> entry = itr.next();
                String fieldName  = entry.getKey();
                String fieldValue = entry.getValue();
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    // hashData: key nguyen ban, value encode US_ASCII
                    hashData.append(fieldName)
                            .append('=')
                            .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    // query: ca key va value deu encode US_ASCII
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()))
                         .append('=')
                         .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    if (itr.hasNext()) {
                        hashData.append('&');
                        query.append('&');
                    }
                }
            }

            String hashDataStr = hashData.toString();

            // Su dung CHINH XAC secret key doc tu properties
            String secretKey = vnpHashSecret;
            String vnp_SecureHash = hmacSHA512(secretKey, hashDataStr);

            System.out.println("=== [VNPAY DEBUG] TmnCode    : " + vnpTmnCode);
            System.out.println("=== [VNPAY DEBUG] HashSecret  : " + vnpHashSecret);
            System.out.println("=== [VNPAY DEBUG] Hash Data   : " + hashDataStr);
            System.out.println("=== [VNPAY DEBUG] SecureHash  : " + vnp_SecureHash);

            String queryUrl = query + "&vnp_SecureHash=" + vnp_SecureHash;
            String paymentUrl = vnpPayUrl + "?" + queryUrl;
            System.out.println("=== [VNPAY DEBUG] Payment URL : " + paymentUrl);

            return paymentUrl;
        } catch (Exception e) {
            throw new RuntimeException("Loi khi tao URL VNPay: " + e.getMessage());
        }
    }
}
