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

our $VERSION = "0.0";

use constant DEBUG => 0;    # toggle me

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

#    Foswiki::Func::registerTagHandler( 'EXAMPLETAG', \&_EXAMPLETAG );

    Foswiki::Func::registerRESTHandler( 'terror', \&restTerror );
    Foswiki::Func::registerRESTHandler( 'access', \&restAccess );

    # Plugin correctly initialized
    return 1;
}

# The function used to handle the %EXAMPLETAG{...}% macro
# You would have one of these for each macro you want to process.
#sub _EXAMPLETAG {
#    my($session, $params, $topic, $web, $topicObject) = @_;
#    # $session  - a reference to the Foswiki session object
#    #             (you probably won't need it, but documented in Foswiki.pm)
#    # $params=  - a reference to a Foswiki::Attrs object containing
#    #             parameters.
#    #             This can be used as a simple hash that maps parameter names
#    #             to values, with _DEFAULT being the name for the default
#    #             (unnamed) parameter.
#    # $topic    - name of the topic in the query
#    # $web      - name of the web in the query
#    # $topicObject - a reference to a Foswiki::Meta object containing the
#    #             topic the macro is being rendered in (new for foswiki 1.1.x)
#    # Return: the result of processing the macro. This will replace the
#    # macro call in the final text.
#
#    # For example, %EXAMPLETAG{'hamburger' sideorder="onions"}%
#    # $params->{_DEFAULT} will be 'hamburger'
#    # $params->{sideorder} will be 'onions'
#}

=begin TML

---++ earlyInitPlugin()

This handler is called before any other handler, and before it has been
determined if the plugin is enabled or not. Use it with great care!

If it returns a non-null error string, the plugin will be disabled.

=cut

=begin TML

---++ restExample($session) -> $text

This is an example of a sub to be called by the =rest= script. The parameter is:
   * =$session= - The Foswiki object associated to this session.

Additional parameters can be recovered via the query object in the $session, for example:

my $query = $session->{request};
my $web = $query->{param}->{web}[0];

If your rest handler adds or replaces equivalent functionality to a standard script
provided with Foswiki, it should set the appropriate context in its switchboard entry.
In addition to the obvous contexts:  =view=, =diff=,  etc. the =static= context is used
to indicate that the resulting output will be read offline, such as in a PDF,  and 
dynamic links (edit, sorting, etc) should not be rendered.

A comprehensive list of core context identifiers used by Foswiki is found in
%SYSTEMWEB%.IfStatements#Context_identifiers. Please be careful not to
overwrite any of these identifiers!

For more information, check %SYSTEMWEB%.CommandAndCGIScripts#rest

For information about handling error returns from REST handlers, see
Foswiki:Support.Faq1

*Since:* Foswiki::Plugins::VERSION 2.0

=cut

sub restTerror {
   my ( $session, $subject, $verb, $response ) = @_;

   my $eventsLog = $Foswiki::cfg{Log}{Dir}.'/events.log';

   my $webs = $session->{request}->param( 'webs' ) || '.*';
   my $topics = $session->{request}->param( 'topics' ) || '.*';

   my $webregex = qr#^(?:$webs)$#;
   my $topicregex = qr#^(?:$topics)$#;


   my $d = parseEvents( $eventsLog, $webregex, $topicregex );
   return "<html><head><title>Result</title></head><body><pre>$d</pre></body></html>";

#   Foswiki::Func::saveTopic('Ost3','Report', undef, "<pre>$d</pre>");
#   Foswiki::Func::moveTopic('Ost5','Report', undef,undef);

#    $session->redirect(Foswiki::Func::getScriptUrl('Ost3', 'ExtremeStatistics', 'view'));
}

sub parseEvents {
    my ( $eventsLog, $webregex, $topicregex ) = @_;

    open ( my $file, "<", $eventsLog ) or die "Error opening $eventsLog."; # XXX

    my $webtopics = {};
    my $att = {};
    local $_;
    while ( <$file> ) {
        # | 2013-10-18T07:07:30Z info | admin | viewfile | Ost3.Geheim | 1003002_ACQMM_PWS.png Firefox | 127.0.0.1 |
        next unless $_ =~ m#\| ([^T]+).+ info \| .+ \| (.+) \| (.+) \| (.+) \| \d+\.\d+\.\d+\.\d+ \|#;
        my ( $time, $mode, $webtopic, $what ) = ( $1, $2, $3, $4 );
        my ( $web, $topic ) = Foswiki::Func::normalizeWebTopicName( '', $webtopic );
        next unless $web =~ m#$webregex#;
        next unless $topic =~ m#$topicregex#;
        if ( $mode eq 'view' ) {
            doYouRememberTheTime( $webtopics, $webtopic, $time );
        }
        elsif ( $mode eq 'viewfile' ) {
            next unless $what =~ m#^([^\s]+)#;
            my $attachment = "$webtopic/$1";
            doYouRememberTheTime( $att, $attachment, $time );
        }
    }

    use Data::Dumper; return Dumper($webtopics)."\n----\n".Dumper($att);
}

sub doYouRememberTheTime {
    my ( $where, $what, $time ) = @_;

    return unless $time =~ m#^(\d{4}-\d{2})-\d{2}#;
    my $ym = $1;

    $where->{$what} = {} unless $where->{$what};

    if ( $where->{$what}->{$time} ) {
        $where->{$what}->{$time}++;
    } else {
        $where->{$what}->{$time} = 1;
    }
    if ( $where->{$what}->{$ym} ) {
        $where->{$what}->{$ym}++;
    } else {
        $where->{$what}->{$ym} = 1;
    }
}

sub restAccess {
    my ( $session, $subject, $verb, $response ) = @_;

    my ( $startYear, $startMonth, $endYear, $endMonth );
    my $start = $session->{request}->param( 'start' );
    if($start && $start =~ m#^\s*(\d{4})\s*-\s*(\d{1,2})\s*$#) {
        $startYear = $1;
        $startMonth = $2;
    }

    my $end = $session->{request}->param( 'end' );
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

    my $topN = $session->{request}->param( 'topN' ) || 20;
    my $view_slack = $session->{request}->param( 'view_slack' );
    my $edit_slack = $session->{request}->param( 'edit_slack' );

    my $skipWebs = $session->{request}->param( 'skipWebs' );
    my $skipTopics = $session->{request}->param( 'skipTopics' );

    my $logData = _collectLogData( $session, $start, $end, $view_slack, $edit_slack, $skipWebs, $skipTopics );

    $logData->{statSavesCombinedRef} = {};
    foreach my $eachweb (keys $logData->{statSavesRef}) {
        my $sub = $logData->{statSavesSubwebsRef}{$eachweb} || 0;
        $logData->{statSavesCombinedRef}{$eachweb} = $logData->{statSavesRef}{$eachweb} + $sub;
    }

    $logData->{statViewsCombinedRef} = {};
    foreach my $eachweb (keys $logData->{statViewsRef}) {
        my $sub = $logData->{statViewsSubwebsRef}{$eachweb} || 0;
        $logData->{statViewsCombinedRef}{$eachweb} = $logData->{statViewsRef}{$eachweb} + $sub;
    }

    my @view_top = [];
    my @edit_top = [];
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
#   foreach my $eachweb ($logData->{editRef}) {
#       push(@edit_top, map { "$eachweb/$_" => $logData->{editRef}{$eachweb}{$_} } $logData->{editRef}{$eachweb} );
#   }
    @view_top = sort {$view_omni->{$b} <=> $view_omni->{$a}} keys $view_omni;
    @edit_top = sort {$edit_omni->{$b} <=> $edit_omni->{$a}} keys $edit_omni;
    @view_top = @view_top[0 .. $topN-1];
    $logData->{view_top} = \@view_top;
    @edit_top = @edit_top[0 .. $topN-1];
    $logData->{edit_top} = \@edit_top;

#   return $logData->{view_top};
    my $view_csv = '';
    foreach my $eachtop (@{$logData->{view_top}}) {
        next unless $view_omni->{$eachtop}; # == (does not exist) or less than topN entries
        $view_csv .= "$eachtop,$view_omni->{$eachtop}\n";
    }

    my $edit_csv = '';
    foreach my $eachtop (@{$logData->{edit_top}}) {
        next unless $edit_omni->{$eachtop}; # == less than topN entries
        $edit_csv .= "$eachtop,$edit_omni->{$eachtop}\n";
    }

    return "<html><head><title>Result</title></head><body><h1>Looking at $startYear/$startMonth/01 - $endYear/$endMonth/01</h1><h2>View top $topN:</h1><pre>$view_csv</pre><hr /><h2>Edit top $topN:</h1><pre>$edit_csv</pre></body></html>";
    return '<html><head><title>Result</title></head><body><pre>'.Dumper($logData).'</pre></body></html>';
}


sub _collectLogData {
    my ( $session, $start, $end, $viewSlack, $saveSlack, $skipWebs, $skipTopics ) = @_;

    my $skipWebRegex;
    if($skipWebs) {
        my @allWebs = split(/\s*,\s*/, $skipWebs);
        $skipWebs =~ join('|', @allWebs); # XXX \Q..\E
        $skipWebRegex = qr#^(?:$skipWebs)(?:/|$)#;
    }

    $viewSlack ||= 60*60; # 1h
    $saveSlack ||= 60*60; # 1h

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
        statUploadsRef => {}
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
            $logFileUserName =
              Foswiki::Func::getCanonicalUserID($logFileUserName);
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
            next if $skipWebRegex && $webName =~ m#$skipWebRegex#;

            if ( $opName eq 'view' ) {
                next if ( $topicName eq 'WebRss' );
                next if ( $topicName eq 'WebAtom' );
                my $user = $users->webDotWikiName($logFileUserName);
                my $lastView = $lastTime->{view}->{$webName}{$topicName}{$user};
                next if $lastView && ($date - $lastView < $viewSlack);

                # log web access
                $data->{statViewsRef}{$webName}++;
                my $subWeb = $webName;
                while($subWeb =~ m/(.*)[.\/]/) {
                    $subWeb = $1;
                    $data->{statViewsSubwebsRef}->{$subWeb}++;
                }

                # log topic access
                $lastTime->{view}->{$webName}{$topicName}{$user} = $date;
                unless ( $notes && $notes =~ /\(not exist\)/ ) {
                    $data->{viewRef}->{$webName}{$topicName}++;
                }

            }
            elsif ( $opName eq 'save' ) {
                my $user = $users->webDotWikiName($logFileUserName);
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

                # Get number of views for old topic this month (may be zero)
                my $oldViews = $data->{viewRef}->{$webName}{$topicName} || 0;

                # Transfer views from old to new topic
                $data->{viewRef}->{$newTopicWeb}{$newTopicName} = $oldViews;
                delete $data->{viewRef}->{$webName}{$topicName};

                # Transfer views from old to new web
                if ( $newTopicWeb ne $webName ) {
                    $data->{statViewsRef}{$webName} -= $oldViews;
                    $data->{statViewsRef}{$newTopicWeb} += $oldViews;
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

Author: StephanOstold

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
