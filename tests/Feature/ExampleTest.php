<?php

it('redirects home to login', function () {
    $response = $this->get('/');

    $response->assertRedirect('/login');
});
