package com.example.gigachatb.config.wsHandler;

import lombok.RequiredArgsConstructor;

import java.security.Principal;

@RequiredArgsConstructor
public class StompPrincipal implements Principal {
    private final String name;

    @Override
    public String getName() {
        return null;
    }

}
