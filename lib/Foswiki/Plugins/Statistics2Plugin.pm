# See bottom of file for default license and copyright information

package Foswiki::Plugins::Statistics2Plugin;

# Always use strict to enforce variable scoping
use strict;
use warnings;


use Foswiki::Sandbox                ();
use Foswiki::WebFilter              ();
use Foswiki::Meta                   ();
use Foswiki::AccessControlException ();

use Foswiki                         ();
use Foswiki::Func    ();    # The plugins API
use Foswiki::Plugins ();    # For the API version
use Foswiki::UI                     ();
use Foswiki::Time                   ();

use Foswiki::Contrib::JsonRpcContrib ();

use Foswiki::Plugins::Statistics2Plugin::Result();

our $VERSION = "0.0";

use constant DEBUG => 0;

#
# If you intend to use the _nnn "alpha suffix, declare it using version->parse().
#
#    use version; our $VERSION = version->parse("1.20_001");
#     use version; our $VERSION = version->declare("v1.2.0");
#

our $RELEASE = '0.0.1';

# One line description, is shown in the %SYSTEMWEB%.TextFormattingRules topic:
our $SHORTDESCRIPTION = 'Terror!';;

our $NO_PREFS_IN_TOPIC = 1;

sub initPlugin {
    my ( $topic, $web, $user, $installWeb ) = @_;

    # check for Plugins.pm versions
    if ( $Foswiki::Plugins::VERSION < 2.0 ) {
        Foswiki::Func::writeWarning( 'Version mismatch between ',
            __PACKAGE__, ' and Plugins.pm' );
        return 0;
    }

    Foswiki::Contrib::JsonRpcContrib::registerMethod( "Statistics2Plugin", "access", \&jsonAccess );

    # Plugin correctly initialized
    return 1;
}

sub jsonAccess {
    my ($session, $request) = @_;

    my ( $startYear, $startMonth, $endYear, $endMonth );
    my $start = $request->param( 'start' );
    if($start && $start =~ m#^\s*(\d{4})\s*-\s*(\d{1,2})\s*$#) {
        $startYear = $1;
        $startMonth = $2;
    }

    my $end = $request->param( 'end' );
    if($end && $end =~ m#^\s*(\d{4})\s*-\s*(\d{1,2})\s*$#) {
        $endYear = $1;
        $endMonth = $2;
    }

    if($endMonth && $endYear) {
        $end = Foswiki::Time::parseTime("$endYear-$endMonth-01");
    } else {
        $endMonth = Foswiki::Time::formatTime(time(), '$mo');
        $endYear = Foswiki::Time::formatTime(time(), '$year');
        $end = Foswiki::Time::parseTime(
            "$endYear-$endMonth-01"
        );
    }
    if($startMonth && $startYear) {
        $start = Foswiki::Time::parseTime("$startYear-$startMonth-01");
    } else {
        $startMonth = $endMonth;
        $startMonth = ($startMonth + 11) % 12;
        $startYear = $endYear;
        $startYear-- if($startMonth == 12);
        $start = Foswiki::Time::parseTime(
            "$startYear-$startMonth-01"
        );
    }

    my $topN = $request->param( 'topN' ) || 20;
    my $view_slack = $request->param( 'view_slack' );
    my $edit_slack = $request->param( 'edit_slack' );
    my $maxInterval = $request->param( 'max_interval' );

    my $skipWebs = $request->param( 'skipWebs' );
    my $skipTopics = $request->param( 'skipTopics' );
    my $skipUsers = $request->param( 'skipUsers' );

    my $logData = _collectLogData( $session, $start, $end, $view_slack, $edit_slack, $skipWebs, $skipTopics, $skipUsers, $maxInterval );

    $logData->{topEditRange} = $topN;
    $logData->{topViewRange} = $topN;
    $logData->{topEditorsRange} = $topN;
    $logData->{topViewersRange} = $topN;

    $logData->{statSavesCombinedRef} = {};
    foreach my $eachweb (keys %{$logData->{statSavesRef}}) {
        my $sub = $logData->{statSavesSubwebsRef}{$eachweb} || 0;
        $logData->{statSavesCombinedRef}{$eachweb} = $logData->{statSavesRef}{$eachweb} + $sub;
    }

    $logData->{statViewsCombinedRef} = {};
    foreach my $eachweb (keys %{$logData->{statViewsRef}}) {
        my $sub = $logData->{statViewsSubwebsRef}{$eachweb} || 0;
        $logData->{statViewsCombinedRef}{$eachweb} = $logData->{statViewsRef}{$eachweb} + $sub;
    }

    my @view_top = [];
    my @edit_top = [];
    my @editors_top = [];
    my @viewers_top = [];
    my $view_omni = {};
    my $edit_omni = {};
    foreach my $eachweb (keys %{$logData->{viewRef}}) {
        foreach my $eachtopic (keys %{$logData->{viewRef}{$eachweb}}) {
            $view_omni->{"$eachweb/$eachtopic"} = $logData->{viewRef}{$eachweb}{$eachtopic};
        }
    }
    foreach my $eachweb (keys %{$logData->{saveRef}}) {
        foreach my $eachtopic (keys %{$logData->{saveRef}{$eachweb}}) {
            $edit_omni->{"$eachweb/$eachtopic"} = $logData->{saveRef}{$eachweb}{$eachtopic};
        }
    }
    @view_top = sort {$view_omni->{$b} <=> $view_omni->{$a}} keys %$view_omni;
    @edit_top = sort {$edit_omni->{$b} <=> $edit_omni->{$a}} keys %$edit_omni;
    @editors_top = sort {$logData->{editors}->{$b} <=> $logData->{editors}->{$a}} keys %{$logData->{editors}};
    @viewers_top = sort {$logData->{viewers}->{$b} <=> $logData->{viewers}->{$a}} keys %{$logData->{viewers}};
    @view_top = @view_top[0 .. max($topN, scalar @view_top)-1];
    $logData->{view_top} = \@view_top;
    @edit_top = @edit_top[0 .. max($topN, scalar @edit_top)-1];
    $logData->{edit_top} = \@edit_top;
    @editors_top = @editors_top[0 .. max($topN, scalar @editors_top)-1];
    $logData->{editors_top} = \@editors_top;
    @viewers_top = @viewers_top[0 .. max($topN, scalar @viewers_top)-1];
    $logData->{viewers_top} = \@viewers_top;

    $logData->{title} = Foswiki::Func::expandCommonVariables('%MAKETEXT{"Looking at [_1] - [_2]" args="'."$startYear/$startMonth/01,$endYear/$endMonth/01".'"}%');

    return Foswiki::Plugins::Statistics2Plugin::Result->new($logData);
}

sub max {
    my ($a, $b) = @_;
    return ($a < $b)?$a:$b;
}

sub _regexify {
    my ( $string, $containsGroups ) = @_;

    if($string) {
        $string =~ s#^\s+##;
        $string =~ s#\s+$##;
        my @allEntries = split(/\s*,\s*/, $string);
        if($containsGroups) {
            my $members = {};
            foreach my $entry ( @allEntries ) {
                if(Foswiki::Func::isGroup($entry)) {
                    my $i = Foswiki::Func::eachGroupMember($entry);
                    while($i->hasNext()) {
                        my $user = $i->next();
                        $user = Foswiki::Func::getWikiUserName($user);
                        $members->{$user} = 1;
                    }
                } else {
                    $entry = Foswiki::Func::getWikiUserName($entry);
                    $members->{$entry} = 1;
                }
            }
            @allEntries = keys %$members;
        }
        $string = join('|', @allEntries); # XXX \Q..\E
        return undef unless $string;
        return qr#^(?:$string)$# if $containsGroups;
        return qr#^(?:$string)(?:/|$)#;
    }
    return undef;
}

sub _collectLogData {
    my ( $session, $start, $end, $viewSlack, $saveSlack, $skipWebs, $skipTopics, $skipUsers, $maxInterval ) = @_;

    my $skipWebRegex = _regexify($skipWebs);
    my $skipTopicRegex = _regexify($skipTopics);
    my $skipUserRegex = _regexify($skipUsers, 1);

    $viewSlack ||= 60*60; # 1h
    $saveSlack ||= 60*60; # 1h

    $maxInterval ||= 12*60*60; # halve a day

    # Log file contains: $user, $action, $webTopic, $extra, $remoteAddr
    # $user - cUID of user - default current user,
    # or failing that the user agent
    # $action - what happened, e.g. view, save, rename
    # $webTopic - what it happened to
    # $extra - extra info, such as minor flag
    # $remoteAddr = e.g. 127.0.0.5

    my $data = {
        viewRef    => {},  # Hash of hashes, counts topic views by (web, topic)
        saveRef    => {},  # Hash of hashes, counts topic saves by (web, topic)
        contribRef => {},  # Hash of hashes, counts uploads/saves by (web, user)
             # Hashes for each type of statistic, one hash entry per web
        statViewsRef   => {},
        statViewsSubwebsRef   => {},
        statSavesRef   => {},
        statSavesSubwebsRef   => {},
        statUploadsRef => {},
        viewIntervals => {},
        saveIntervals => {},
    };

    my $lastTime2 = {
        view => {},
        save => {}
    };

    my $lastTime = {
        view => {},
        save => {}
    };

    my $users = $session->{users};

    my $it = $session->logger->eachEventSince( $start, 'info' );
    while ( $it->hasNext() ) {
        my $line = $it->next();
        my $date = shift(@$line);
        last if $date > $end;    # Stop processing when we've done one month
        my $logFileUserName;

        while ( !$logFileUserName && scalar(@$line) ) {
            $logFileUserName = shift @$line;

            # Use Func::getCanonicalUserID because it accepts login,
            # wikiname or web.wikiname
#XXX put me back!            $logFileUserName =
#              Foswiki::Func::getCanonicalUserID($logFileUserName);
        }

        my ( $opName, $webTopic, $notes, $ip ) = @$line;

        # ignore events that are not statistically helpful
        next if ( $notes && $notes =~ /dontlog/ );

# ignore events statistics doesn't understand for now - idea: make a "top search phrase list"
        next
          if ( $opName
            && $opName =~
            /search|renameweb|changepasswd|resetpasswd|sudo login|logout/ );

        # .+ is used because topics name can contain stuff like
        # !, (, ), =, -, _ and they should have stats anyway
        if (   $webTopic
            && $opName
            && $webTopic =~
/(^$Foswiki::regex{webNameRegex})\.($Foswiki::regex{wikiWordRegex}$|$Foswiki::regex{abbrevRegex}|.+)/
          )
        {
            my $webName   = $1;
            my $topicName = $2;
            $webName =~ s#\.#/#g;
            $webName =~ s#/#?#g;
            next if $skipWebRegex && $webName =~ m#$skipWebRegex#;
            next if $skipTopicRegex && $topicName =~ m#$skipTopicRegex#;

            if ( $opName eq 'view' ) {
                my $user = $users->webDotWikiName($logFileUserName);
                next if $skipUserRegex && $user =~ m#$skipUserRegex#;

                my $lastView2 = $lastTime2->{view}->{$webName}{$topicName}{$user};
                $lastTime2->{view}->{$webName}{$topicName}{$user} = $date;
                if($lastView2) {
                    my $interval = $date - $lastView2;
                    if($interval > $maxInterval) {
                        $interval = $maxInterval;
                    }
                    if($interval < 0) {
                        Foswiki::Func::writeWarning("negative interval at ".join(':', @$line));
                    } else {
                        $data->{viewIntervals}{$interval}++;
                    }
                }

                my $lastView = $lastTime->{view}->{$webName}{$topicName}{$user};
                next if $lastView && ($date - $lastView < $viewSlack);

                # log web access
                $data->{statViewsRef}{$webName}++;
                my $subWeb = $webName;
                while($subWeb =~ m/(.*)[.\/]/) {
                    $subWeb = $1;
                    $data->{statViewsSubwebsRef}->{$subWeb}++;
                }

                # log topic access; count views
                $lastTime->{view}->{$webName}{$topicName}{$user} = $date;
                unless ( $notes && $notes =~ /\(not exist\)/ ) {
                    $data->{viewRef}->{$webName}{$topicName}++;
                    $data->{viewers}->{$user}++;
                }
            }
            elsif ( $opName eq 'save' ) {
                my $user = $users->webDotWikiName($logFileUserName);
                next if $skipUserRegex && $user =~ m#$skipUserRegex#;

                my $lastSave = $lastTime->{save}->{$webName}{$topicName}{$user};
                next if $lastSave && ($date - $lastSave < $saveSlack);

                # log web save
                $data->{statSavesRef}->{$webName}++;
                $data->{contribRef}
                  ->{$webName}{ $users->webDotWikiName($logFileUserName) }++;
                my $subWeb = $webName;
                while($subWeb =~ m/(.*)[.\/]/) {
                    $subWeb = $1;
                    $data->{statSaveSubwebsRef}->{$subWeb}++;
                }

                # log topic save
                $data->{saveRef}->{$webName}{$topicName}++;
                $lastTime->{save}->{$webName}{$topicName}{$user} = $date;

                # log saves per user
                $data->{editors}->{$user}++;
            }
            elsif ( $opName eq 'upload' ) {
                $data->{statUploadsRef}->{$webName}++;
                $data->{contribRef}
                  ->{$webName}{ $users->webDotWikiName($logFileUserName) }++;

            }
            elsif ( $opName eq 'rename' ) {

                # Pick up the old and new topic names
                $notes =~
/moved to ($Foswiki::regex{webNameRegex})\.($Foswiki::regex{wikiWordRegex}|$Foswiki::regex{abbrevRegex}|\w+)/o;
                my $newTopicWeb  = $1;
                my $newTopicName = $2;
                my $skipNewWeb = ($skipWebRegex && $newTopicWeb =~ m#$skipWebRegex#)?1:0;

                # Get number of views for old topic this month (may be zero)
                my $oldViews = $data->{viewRef}->{$webName}{$topicName} || 0;

                # Transfer views from old to new topic
                unless($skipNewWeb) {
                    $data->{viewRef}->{$newTopicWeb}{$newTopicName} = $oldViews;
                }
                delete $data->{viewRef}->{$webName}{$topicName};

                # Transfer views from old to new web
                if ( $newTopicWeb ne $webName ) {
                    $data->{statViewsRef}{$webName} -= $oldViews;
                    unless($skipNewWeb) {
                        $data->{statViewsRef}{$newTopicWeb} += $oldViews;
                    }
                }
            }
        }
        else {

            # ignore template webs.  (Regex copied from Foswiki::WebFilter)
            if ( defined $webTopic ) {
                my ( $w, $t ) = split( /\./, $webTopic );
                next if $w =~ /(?:^_|\/_)/;
            }

            $session->logger->log( 'debug',
                'WebStatistics: Bad logfile line ' . join( '|', @$line ) )
              if (DEBUG);
        }
    }

    return $data;
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
