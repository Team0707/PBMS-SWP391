package com.parking.pbms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PbmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(PbmsApplication.class, args);
	}

}
