import * as React from 'react';
import Markdown from 'markdown-to-jsx';
import classNames from 'classnames';

import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';
import { Social, Action, Link } from '../../atoms';
import ImageBlock from '../../blocks/ImageBlock';

export default function Footer(props) {
    const {
        colors = 'bg-light-fg-dark',
        logo,
        title,
        text,
        primaryLinks,
        secondaryLinks,
        socialLinks = [],
        legalLinks = [],
        copyrightText,
        styles = {}
    } = props;
    return (
        <footer
            className={classNames(
                'sb-component',
                'sb-component-footer',
                colors,
                styles?.self?.margin ? mapStyles({ padding: styles?.self?.margin }) : undefined,
                styles?.self?.padding ? mapStyles({ padding: styles?.self?.padding }) : 'px-4 py-28'
            )}
            data-sb-object-id={props['data-sb-object-id']}
        >
            <div className="mx-auto max-w-7xl">
                <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-8">
                    {(logo?.url || title || text) && (
                        <div className="pb-8 sm:col-span-3 lg:col-auto">
                            {(logo?.url || title || text) && (
                                <Link href="/" className="flex flex-col items-start">
                                    {logo && <ImageBlock {...logo} className="inline-block w-auto" />}
                                    {title && (
                                        <div className="h4" >
                                            {title}
                                        </div>
                                    )}
                                </Link>
                            )}
                            {text && (
                                <Markdown
                                    options={{ forceBlock: true, forceWrapper: true }}
                                    className={classNames('sb-markdown', 'text-sm', { 'mt-4': title || logo?.url })}
                                >
                                    {text}
                                </Markdown>
                            )}
                        </div>
                    )}
                    {primaryLinks && <FooterLinksGroup {...primaryLinks} />}
                    {secondaryLinks && <FooterLinksGroup {...secondaryLinks} />}
                    {socialLinks.length > 0 && (
                        <div className="pb-6">
                            <ul className="flex flex-wrap items-center" >
                                {socialLinks.map((link, index) => (
                                    <li key={index} className="text-2xl mb-2 mr-8 lg:mr-12 last:mr-0">
                                        <Social {...link}  />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {(!copyrightText || legalLinks.length > 0) && (
                    <div className="sb-footer-bottom border-t pt-8 mt-16 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between">
                        {legalLinks.length > 0 && (
                            <ul className="flex flex-wrap mb-3" >
                                {legalLinks.map((link, index) => (
                                    <li key={index} className="mb-1 mr-6 last:mr-0">
                                        <Action {...link} className="text-sm" />
                                    </li>
                                ))}
                            </ul>
                        )}
                        {copyrightText && (
                            <Markdown
                                options={{ forceInline: true, forceWrapper: true, wrapper: 'p' }}
                                className={classNames('sb-markdown', 'text-sm', 'mb-4', { 'sm:order-first sm:mr-12': legalLinks.length > 0 })}
                            >
                                {copyrightText}
                            </Markdown>
                        )}
                    </div>
                )}
            </div>
        </footer>
    );
}

function FooterLinksGroup(props) {
    const { title, links = []} = props;
    if (links.length === 0) {
        return null;
    }
    return (
        <div className="pb-8">
            {title && (
                <h2 className="uppercase text-base tracking-wide" >
                    {title}
                </h2>
            )}
            {links.length > 0 && (
                <ul className={classNames('space-y-3', { 'mt-7': title })} >
                    {links.map((link, index) => (
                        <li key={index}>
                            <Action {...link} className="text-sm" />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
