# See bottom of file for default license and copyright information

package Foswiki::Plugins::Statistics2Plugin::Result;

# Always use strict to enforce variable scoping
use strict;
use warnings;

use JSON;

sub new {
    my ($class, $data) = @_;

    my $this = {};
    $this->{data} = $data;

    bless($this, $class);

    return $this;
}

sub TO_JSON {
    my ($this) = @_;

    my $json = JSON->new->allow_nonref;

    my $encoded = $json->encode( $this->{data} );
    return $encoded;
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Author: StephanOsthold

Copyright (C) 2008-2013 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
